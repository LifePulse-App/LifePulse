#import "NVActivityIndicatorAnimationCircleStrokeSpin.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationCircleStrokeSpin

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CFTimeInterval beginTime = 0.5 / speedMultiplier;
    CFTimeInterval strokeStartDuration = 1.2 / speedMultiplier;
    CFTimeInterval strokeEndDuration = 0.7 / speedMultiplier;
    
    CABasicAnimation *rotationAnimation = [CABasicAnimation animationWithKeyPath:@"transform.rotation"];
    rotationAnimation.byValue = @(M_PI * 2);
    rotationAnimation.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
    
    CABasicAnimation *strokeEndAnimation = [CABasicAnimation animationWithKeyPath:@"strokeEnd"];
    strokeEndAnimation.duration = strokeEndDuration;
    strokeEndAnimation.timingFunction = [CAMediaTimingFunction functionWithControlPoints:0.4 :0.0 :0.2 :1.0];
    strokeEndAnimation.fromValue = @0;
    strokeEndAnimation.toValue = @1;
    
    CABasicAnimation *strokeStartAnimation = [CABasicAnimation animationWithKeyPath:@"strokeStart"];
    strokeStartAnimation.duration = strokeStartDuration;
    strokeStartAnimation.timingFunction = [CAMediaTimingFunction functionWithControlPoints:0.4 :0.0 :0.2 :1.0];
    strokeStartAnimation.fromValue = @0;
    strokeStartAnimation.toValue = @1;
    strokeStartAnimation.beginTime = beginTime;
    
    CAAnimationGroup *groupAnimation = [CAAnimationGroup animation];
    groupAnimation.animations = @[rotationAnimation, strokeEndAnimation, strokeStartAnimation];
    groupAnimation.duration = strokeStartDuration + beginTime;
    groupAnimation.repeatCount = HUGE_VALF;
    groupAnimation.removedOnCompletion = NO;
    groupAnimation.fillMode = kCAFillModeForwards;
    
    CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeStroke 
                                                                 size:size 
                                                                color:color];
    CGRect frame = CGRectMake((layer.bounds.size.width - size.width) / 2,
                             (layer.bounds.size.height - size.height) / 2,
                             size.width,
                             size.height);
    circle.frame = frame;
    [circle addAnimation:groupAnimation forKey:@"animation"];
    [layer addSublayer:circle];
}

@end
