#import "NVActivityIndicatorAnimationBallClipRotateMultiple.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationBallClipRotateMultiple

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat bigCircleSize = size.width;
    CGFloat smallCircleSize = size.width / 2;
    CFTimeInterval longDuration = 1.0 / speedMultiplier;
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionEaseInEaseOut];

    [self circleOfShape:NVActivityIndicatorShapeRingTwoHalfHorizontal
               duration:longDuration
         timingFunction:timingFunction
                  layer:layer
                   size:bigCircleSize
                  color:color
                reverse:NO];
    
    [self circleOfShape:NVActivityIndicatorShapeRingTwoHalfVertical
               duration:longDuration
         timingFunction:timingFunction
                  layer:layer
                   size:smallCircleSize
                  color:color
                reverse:YES];
}

- (CAAnimation *)createAnimationInDuration:(CFTimeInterval)duration timingFunction:(CAMediaTimingFunction *)timingFunction reverse:(BOOL)reverse {
    // Scale animation
    CAKeyframeAnimation *scaleAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.keyTimes = @[@0, @0.5, @1];
    scaleAnimation.timingFunctions = @[timingFunction, timingFunction];
    scaleAnimation.values = @[@1, @0.6, @1];
    scaleAnimation.duration = duration;

    // Rotate animation
    CAKeyframeAnimation *rotateAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.rotation.z"];
    rotateAnimation.keyTimes = scaleAnimation.keyTimes;
    rotateAnimation.timingFunctions = @[timingFunction, timingFunction];
    if (!reverse) {
        rotateAnimation.values = @[@0, @(M_PI), @(2 * M_PI)];
    } else {
        rotateAnimation.values = @[@0, @(-M_PI), @(-2 * M_PI)];
    }
    rotateAnimation.duration = duration;

    // Animation
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, rotateAnimation];
    animation.duration = duration;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;

    return animation;
}

- (void)circleOfShape:(NVActivityIndicatorShape)shape 
             duration:(CFTimeInterval)duration 
       timingFunction:(CAMediaTimingFunction *)timingFunction 
                layer:(CALayer *)layer 
                 size:(CGFloat)size 
                color:(UIColor *)color 
              reverse:(BOOL)reverse {
    CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:shape size:CGSizeMake(size, size) color:color];
    CGRect frame = CGRectMake((layer.bounds.size.width - size) / 2,
                             (layer.bounds.size.height - size) / 2,
                             size,
                             size);
    CAAnimation *animation = [self createAnimationInDuration:duration timingFunction:timingFunction reverse:reverse];

    circle.frame = frame;
    [circle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:circle];
}

@end
